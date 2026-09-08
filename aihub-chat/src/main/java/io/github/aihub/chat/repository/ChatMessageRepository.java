package io.github.aihub.chat.repository;

import io.github.aihub.chat.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findAllByConversationIdOrderByCreatedAtAscIdAsc(Long conversationId);
}
