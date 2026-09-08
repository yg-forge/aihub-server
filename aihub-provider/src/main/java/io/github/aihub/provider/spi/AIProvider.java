package io.github.aihub.provider.spi;

import io.github.aihub.model.ModelInfo;
import io.github.aihub.provider.dto.*;
import io.github.aihub.provider.stream.*;
import java.util.List;
import reactor.core.publisher.Flux;

public interface AIProvider {
    String name();
    boolean supports(String model);
    List<ModelInfo> models();
    ProviderChatResponse chat(ProviderChatRequest request);
    Flux<ProviderStreamEvent> stream(ProviderChatRequest request);
}
