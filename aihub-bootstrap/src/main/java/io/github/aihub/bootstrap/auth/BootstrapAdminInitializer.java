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
     @Value("${aihub.auth.bootstrap-admin.tenant-id:1}") Long tenantId,
     @Value("${aihub.auth.bootstrap-admin.reset-password:false}") boolean resetPassword) {
  return args -> {
   String normalizedUsername = username == null ? "" : username.trim();
   if (normalizedUsername.isBlank() || password == null || password.isBlank()) return;
   if (password.length() < 8) throw new IllegalStateException("BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters");

   long effectiveTenantId = tenantId == null ? 1L : tenantId;
   var existing = users.findByUsername(normalizedUsername);
   if (existing.isPresent()) {
    SysUser admin = existing.get();
    boolean changed = false;
    if (!"SUPER_ADMIN".equals(admin.role)) {
     admin.role = "SUPER_ADMIN";
     changed = true;
    }
    if (admin.tenantId == null) {
     admin.tenantId = effectiveTenantId;
     changed = true;
    }
    if (resetPassword && !encoder.matches(password, admin.passwordHash)) {
     admin.passwordHash = encoder.encode(password);
     changed = true;
    }
    if (changed) users.save(admin);
    return;
   }

   SysUser admin = new SysUser();
   admin.username = normalizedUsername;
   admin.passwordHash = encoder.encode(password);
   admin.role = "SUPER_ADMIN";
   admin.tenantId = effectiveTenantId;
   users.save(admin);
  };
 }
}
