package io.github.aihub.chat.controller;

import io.github.aihub.chat.dto.ConversationDtos;
import io.github.aihub.chat.service.ConversationService;
import io.github.aihub.common.api.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/conversations")
public class ConversationController {
    private final ConversationService service;

    public ConversationController(ConversationService service) { this.service = service; }

    @GetMapping
    public ApiResponse<?> list(Authentication auth) { return ApiResponse.success(service.list(auth.getName())); }

    @PostMapping
    public ApiResponse<?> create(Authentication auth, @Valid @RequestBody ConversationDtos.CreateRequest request) {
        return ApiResponse.success(service.create(auth.getName(), request));
    }

    @GetMapping("/{id}")
    public ApiResponse<?> get(Authentication auth, @PathVariable Long id) {
        return ApiResponse.success(service.get(auth.getName(), id));
    }

    @PatchMapping("/{id}")
    public ApiResponse<?> rename(Authentication auth, @PathVariable Long id, @Valid @RequestBody ConversationDtos.RenameRequest request) {
        return ApiResponse.success(service.rename(auth.getName(), id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> delete(Authentication auth, @PathVariable Long id) {
        service.delete(auth.getName(), id); return ApiResponse.success(null);
    }

    @GetMapping("/{id}/messages")
    public ApiResponse<?> messages(Authentication auth, @PathVariable Long id) {
        return ApiResponse.success(service.messages(auth.getName(), id));
    }

    @PostMapping("/{id}/messages")
    public ApiResponse<?> send(Authentication auth, @PathVariable Long id, @Valid @RequestBody ConversationDtos.SendMessageRequest request) {
        return ApiResponse.success(service.send(auth.getName(), id, request));
    }

    @PostMapping(value = "/{id}/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<?> stream(Authentication auth, @PathVariable Long id, @Valid @RequestBody ConversationDtos.SendMessageRequest request) {
        return service.stream(auth.getName(), id, request);
    }
}
