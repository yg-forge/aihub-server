package io.github.aihub.chat.service;

import io.github.aihub.chat.dto.*;
import io.github.aihub.chat.model.ChatMessage;
import io.github.aihub.chat.model.Conversation;
import io.github.aihub.chat.repository.*;
import io.github.aihub.provider.dto.ProviderChatRequest;
import io.github.aihub.provider.router.ModelRouter;
import io.github.aihub.system.entity.SysUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import java.util.*;

@Service
public class ConversationService {
    private final ConversationRepository conversations;
    private final ChatMessageRepository messages;
    private final ChatUserRepository users;
    private final ModelRouter router;

    public ConversationService(ConversationRepository conversations, ChatMessageRepository messages,
                               ChatUserRepository users, ModelRouter router) {
        this.conversations = conversations; this.messages = messages; this.users = users; this.router = router;
    }

    private Long userId(String username) {
        return users.findByUsername(username).map(u -> u.id)
                .orElseThrow(() -> new IllegalStateException("Authenticated user not found"));
    }

    public List<ConversationDtos.ConversationSummary> list(String username) {
        return conversations.findAllByUserIdOrderByUpdatedAtDesc(userId(username)).stream().map(this::summary).toList();
    }

    @Transactional
    public ConversationDtos.ConversationSummary create(String username, ConversationDtos.CreateRequest r) {
        Conversation c = new Conversation(); c.setUserId(userId(username)); c.setModel(r.model());
        c.setTitle(r.title() == null || r.title().isBlank() ? "New conversation" : r.title().trim());
        return summary(conversations.save(c));
    }

    public ConversationDtos.ConversationDetail get(String username, Long id) {
        Conversation c = own(username, id);
        return detail(c);
    }

    @Transactional
    public ConversationDtos.ConversationSummary rename(String username, Long id, ConversationDtos.RenameRequest r) {
        Conversation c = own(username, id); c.setTitle(r.title().trim()); return summary(conversations.save(c));
    }

    @Transactional
    public void delete(String username, Long id) { conversations.delete(own(username, id)); }

    public List<ConversationDtos.MessageResponse> messages(String username, Long id) {
        Conversation c = own(username, id);
        return messages.findAllByConversationIdOrderByCreatedAtAscIdAsc(c.getId()).stream().map(this::message).toList();
    }

    @Transactional
    public ChatResponse send(String username, Long id, ConversationDtos.SendMessageRequest r) {
        Conversation c = own(username, id); saveMessage(c.getId(), "user", r.content(), r.model());
        List<ChatMessage> history = messages.findAllByConversationIdOrderByCreatedAtAscIdAsc(c.getId());
        ProviderChatRequest request = new ProviderChatRequest(r.model(), history.stream()
                .map(m -> new ProviderChatRequest.Message(m.getRole(), m.getContent())).toList(), r.temperature(), r.maxTokens());
        var response = router.route(r.model()).chat(request);
        saveMessage(c.getId(), "assistant", response.content(), response.model());
        c.setModel(r.model()); conversations.save(c);
        return new ChatResponse(response.provider(), response.model(), response.content(), response.finishReason());
    }

    public Flux<ChatStreamEvent> stream(String username, Long id, ConversationDtos.SendMessageRequest r) {
        Conversation c = own(username, id); saveMessage(c.getId(), "user", r.content(), r.model());
        List<ChatMessage> history = messages.findAllByConversationIdOrderByCreatedAtAscIdAsc(c.getId());
        ProviderChatRequest request = new ProviderChatRequest(r.model(), history.stream()
                .map(m -> new ProviderChatRequest.Message(m.getRole(), m.getContent())).toList(), r.temperature(), r.maxTokens());
        StringBuilder answer = new StringBuilder();
        return router.route(r.model()).stream(request)
                .map(x -> { if (x.delta() != null) answer.append(x.delta()); return new ChatStreamEvent(x.type(), x.provider(), x.model(), x.delta(), x.finishReason()); })
                .doOnComplete(() -> { if (!answer.isEmpty()) saveMessage(c.getId(), "assistant", answer.toString(), r.model()); c.setModel(r.model()); conversations.save(c); });
    }

    private Conversation own(String username, Long id) {
        return conversations.findByIdAndUserId(id, userId(username))
                .orElseThrow(() -> new NoSuchElementException("Conversation not found"));
    }
    private void saveMessage(Long conversationId, String role, String content, String model) {
        ChatMessage m = new ChatMessage(); m.setConversationId(conversationId); m.setRole(role); m.setContent(content); m.setModel(model); messages.save(m);
    }
    private ConversationDtos.ConversationSummary summary(Conversation c) { return new ConversationDtos.ConversationSummary(c.getId(), c.getTitle(), c.getModel(), c.getCreatedAt(), c.getUpdatedAt()); }
    private ConversationDtos.ConversationDetail detail(Conversation c) { return new ConversationDtos.ConversationDetail(c.getId(), c.getTitle(), c.getModel(), c.getCreatedAt(), c.getUpdatedAt(), messages.findAllByConversationIdOrderByCreatedAtAscIdAsc(c.getId()).stream().map(this::message).toList()); }
    private ConversationDtos.MessageResponse message(ChatMessage m) { return new ConversationDtos.MessageResponse(m.getId(), m.getRole(), m.getContent(), m.getModel(), m.getCreatedAt()); }
}
