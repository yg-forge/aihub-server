package io.github.aihub.bootstrap.config;

import io.github.aihub.tenant.TenantFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TenantConfig {
  @Bean
  FilterRegistrationBean<TenantFilter> tenantFilter() {
    FilterRegistrationBean<TenantFilter> bean = new FilterRegistrationBean<>(new TenantFilter());
    bean.setOrder(10);
    bean.addUrlPatterns("/api/*");
    return bean;
  }
}
