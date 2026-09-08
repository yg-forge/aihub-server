package io.github.aihub.chat.repository;

import io.github.aihub.chat.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    List<Conversation> findAllByUserIdOrderByUpdatedAtDesc(Long userId);
    Optional<Conversation> findByIdAndUserId(Long id, Long userId);
}
