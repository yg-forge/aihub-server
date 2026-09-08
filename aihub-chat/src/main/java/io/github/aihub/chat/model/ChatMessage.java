package io.github.aihub.chat.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "chat_message")
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(nullable = false, length = 32)
    private String role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 128)
    private String model;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public Instant getCreatedAt() { return createdAt; }
}
