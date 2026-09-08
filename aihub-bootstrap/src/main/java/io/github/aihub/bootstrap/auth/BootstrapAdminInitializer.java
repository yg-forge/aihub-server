package io.github.aihub.bootstrap.auth;

import io.github.aihub.system.entity.SysUser;
import io.github.aihub.system.repo.SysUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class BootstrapAdminInitializer {
 @Bean
 CommandLineRunner bootstrapAdmin(
     SysUserRepository users,
     PasswordEncoder encoder,
     @Value("${aihub.auth.bootstrap-admin.username:}") String username,
     @Value("${aihub.auth.bootstrap-admin.password:}") String password,
     @Value("${aihub.auth.bootstrap-admin.tenant-id:1}") Long tenantId) {
  return args -> {
   if (username == null || username.isBlank() || password == null || password.isBlank()) return;
   if (password.length() < 8) throw new IllegalStateException("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters");
   var existing = users.findByUsername(username.trim());
   if (existing.isPresent()) {
    if (!"SUPER_ADMIN".equals(existing.get().role)) {
     existing.get().role = "SUPER_ADMIN";
     users.save(existing.get());
    }
    return;
   }
   SysUser admin = new SysUser();
   admin.username = username.trim();
   admin.passwordHash = encoder.encode(password);
   admin.role = "SUPER_ADMIN";
   admin.tenantId = tenantId == null ? 1L : tenantId;
   users.save(admin);
  };
 }
}
