package io.github.aihub.chat.controller;

import io.github.aihub.chat.dto.*;
import io.github.aihub.chat.service.*;
import io.github.aihub.common.api.*;
import jakarta.validation.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/ai")
public class AIChatController {
    private final AIChatService s;

    public AIChatController(AIChatService s) {
        this.s = s;
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(@Valid @RequestBody ChatRequest r) {
        try {
            return ResponseEntity.ok(ApiResponse.success(s.chat(r)));
        } catch (WebClientResponseException.TooManyRequests e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(ApiResponse.failure("AI provider rate limit exceeded; please retry later"));
        }
    }

    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ChatStreamEvent> stream(@Valid @RequestBody ChatRequest r) {
        return s.stream(r)
                .onErrorMap(WebClientResponseException.TooManyRequests.class,
                        e -> new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                                "AI provider rate limit exceeded; please retry later", e));
    }
}
