package io.github.aihub.bootstrap.auth;

import io.github.aihub.auth.*;
import io.github.aihub.common.api.*;
import io.github.aihub.system.entity.*;
import io.github.aihub.system.repo.*;
import org.springframework.http.*;
import org.springframework.security.crypto.password.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController{
 private final SysUserRepository users;private final PasswordEncoder encoder;private final JwtService jwt;
 AuthController(SysUserRepository u,PasswordEncoder e,JwtService j){users=u;encoder=e;jwt=j;}
 public record Credentials(String username,String password){}
 @PostMapping("/register")
 public ApiResponse<Map<String,Object>> register(@RequestBody Credentials c){
  if(c==null||c.username()==null||c.username().isBlank()||c.password()==null||c.password().length()<8)return ApiResponse.failure("username and password are required; password must be at least 8 characters");
  if(users.findByUsername(c.username()).isPresent())return ApiResponse.failure("username exists");
  SysUser u=new SysUser();u.username=c.username().trim();u.passwordHash=encoder.encode(c.password());u.role="USER";users.save(u);
  return ApiResponse.success(Map.of("username",u.username,"role",u.role));
 }
 @PostMapping("/login")
 public ResponseEntity<ApiResponse<Map<String,String>>> login(@RequestBody Credentials c){
  var u=c==null?null:users.findByUsername(c.username()).orElse(null);
  if(u==null||c.password()==null||!encoder.matches(c.password(),u.passwordHash))return ResponseEntity.status(401).body(ApiResponse.failure("invalid credentials"));
  String t=jwt.issue(u.username,List.of(u.role),u.tenantId);return ResponseEntity.ok(ApiResponse.success(Map.of("accessToken",t)));
 }
}
