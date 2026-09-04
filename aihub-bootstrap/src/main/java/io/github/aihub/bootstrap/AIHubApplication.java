package io.github.aihub.bootstrap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "io.github.aihub")
@EntityScan(basePackages = "io.github.aihub.system.entity")
@EnableJpaRepositories(basePackages = "io.github.aihub.system.repo")
public class AIHubApplication {
    public static void main(String[] args) {
        SpringApplication.run(AIHubApplication.class, args);
    }
}
