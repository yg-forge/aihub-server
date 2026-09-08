package io.github.aihub.chat.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;

public final class ConversationDtos {
    private ConversationDtos() {}

    public record CreateRequest(@NotBlank String model, String title) {}
    public record RenameRequest(@NotBlank String title) {}
    public record SendMessageRequest(@NotBlank String model, @NotBlank String content, Double temperature, Integer maxTokens) {}
    public record ConversationSummary(Long id, String title, String model, Instant createdAt, Instant updatedAt) {}
    public record MessageResponse(Long id, String role, String content, String model, Instant createdAt) {}
    public record ConversationDetail(Long id, String title, String model, Instant createdAt, Instant updatedAt, List<MessageResponse> messages) {}
}
