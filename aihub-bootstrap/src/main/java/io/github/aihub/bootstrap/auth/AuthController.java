package io.github.aihub.bootstrap.auth;
import io.github.aihub.auth.*;import io.github.aihub.common.api.*;import io.github.aihub.system.entity.*;import io.github.aihub.system.repo.*;import org.springframework.http.*;import org.springframework.security.crypto.password.*;import org.springframework.web.bind.annotation.*;import java.util.*;
@RestController @RequestMapping("/api/v1/auth") public class AuthController{
 private final SysUserRepository users;private final PasswordEncoder encoder;private final JwtService jwt;
 AuthController(SysUserRepository u,PasswordEncoder e,JwtService j){users=u;encoder=e;jwt=j;}
 public record Credentials(String username,String password){}
 @PostMapping("/register") public ApiResponse<Map<String,Object>> register(@RequestBody Credentials c){if(users.findByUsername(c.username()).isPresent())return ApiResponse.failure("username exists");SysUser u=new SysUser();u.username=c.username();u.passwordHash=encoder.encode(c.password());u.role=users.count()==0?"SUPER_ADMIN":"USER";users.save(u);return ApiResponse.success(Map.of("username",u.username,"role",u.role));}
 @PostMapping("/login") public ResponseEntity<ApiResponse<Map<String,String>>> login(@RequestBody Credentials c){var u=users.findByUsername(c.username()).orElse(null);if(u==null||!encoder.matches(c.password(),u.passwordHash))return ResponseEntity.status(401).body(ApiResponse.failure("invalid credentials"));String t=jwt.issue(u.username,List.of(u.role));return ResponseEntity.ok(ApiResponse.success(Map.of("accessToken",t)));}}
