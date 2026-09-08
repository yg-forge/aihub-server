package io.github.aihub.provider.controller;

import io.github.aihub.common.api.ApiResponse;
import io.github.aihub.model.ModelInfo;
import io.github.aihub.provider.spi.AIProvider;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/models")
public class ModelController {
    private final List<AIProvider> providers;

    public ModelController(List<AIProvider> providers) {
        this.providers = providers;
    }

    @GetMapping
    public ApiResponse<?> list(Authentication auth) {
        return ApiResponse.success(providers.stream().flatMap(p -> p.models().stream()).toList());
    }
}
