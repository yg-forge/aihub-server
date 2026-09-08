package io.github.aihub.bootstrap.config;

import io.github.aihub.auth.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.context.annotation.*;
import org.springframework.http.*;
import org.springframework.security.config.annotation.method.configuration.*;
import org.springframework.security.config.annotation.web.builders.*;
import org.springframework.security.config.http.*;
import org.springframework.security.core.authority.*;
import org.springframework.security.crypto.bcrypt.*;
import org.springframework.security.crypto.password.*;
import org.springframework.security.authentication.*;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.cors.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;

@Configuration @EnableMethodSecurity public class SecurityConfig{
 @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
 @Bean JwtService jwt(@Value("${aihub.jwt.secret}")String secret){if(secret==null||secret.isBlank()||secret.equals("change-this-development-secret-to-at-least-32-characters"))throw new IllegalStateException("JWT_SECRET must be configured with a non-default secret");if(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8).length<32)throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");return new JwtService(secret);}
 @Bean SecurityFilterChain chain(HttpSecurity h,JwtService jwt)throws Exception{return h.csrf(c->c.disable()).cors(c->c.configurationSource(req->{var x=new CorsConfiguration();x.addAllowedOriginPattern("*");x.addAllowedHeader("*");x.addAllowedMethod("*");return x;})).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS)).authorizeHttpRequests(a->a.dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll().requestMatchers("/","/api/v1/auth/**","/actuator/**").permitAll().anyRequest().authenticated()).addFilterBefore(new JwtFilter(jwt),UsernamePasswordAuthenticationFilter.class).addFilterAfter(new TenantSecurityFilter(),JwtFilter.class).build();}
 static class JwtFilter extends OncePerRequestFilter{
  private final JwtService jwt;JwtFilter(JwtService j){jwt=j;}
  protected void doFilterInternal(HttpServletRequest r,HttpServletResponse s,FilterChain c)throws ServletException,IOException{
   String h=r.getHeader("Authorization");
   if(h!=null&&h.startsWith("Bearer ")){
    try{
     var claims=jwt.parse(h.substring(7)).getPayload();
     var roles=claims.get("roles");
     var authorities=roles instanceof java.util.List<?> list?list.stream().map(x->new SimpleGrantedAuthority(x.toString())).toList():java.util.List.<SimpleGrantedAuthority>of();
     var tenantClaim=claims.get("tenantId");
     if(tenantClaim==null) throw new IllegalArgumentException("JWT tenantId is missing");
     Long tenantId=tenantClaim instanceof Number n?n.longValue():Long.parseLong(tenantClaim.toString());
     var auth=new UsernamePasswordAuthenticationToken(claims.getSubject(),null,authorities);
     auth.setDetails(tenantId);
     org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
    }catch(Exception e){org.springframework.security.core.context.SecurityContextHolder.clearContext();s.setStatus(HttpServletResponse.SC_UNAUTHORIZED);s.setContentType("application/json");s.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Invalid or expired JWT\"}");return;}
   }
   c.doFilter(r,s);
  }
 }
 static class TenantSecurityFilter extends OncePerRequestFilter{
  protected void doFilterInternal(HttpServletRequest r,HttpServletResponse s,FilterChain c)throws ServletException,IOException{
   var auth=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
   if(auth!=null&&auth.isAuthenticated()&&!(auth instanceof AnonymousAuthenticationToken)){
    Object details=auth.getDetails();
    if(!(details instanceof Number)){writeForbidden(s,"Tenant context is missing");return;}
    Long tenantId=((Number)details).longValue();
    String header=r.getHeader("X-Tenant-Id");
    if(header!=null&&!header.isBlank()&&!header.equals(tenantId.toString())){writeForbidden(s,"Tenant mismatch");return;}
   }
   c.doFilter(r,s);
  }
  private void writeForbidden(HttpServletResponse s,String message)throws IOException{s.setStatus(HttpServletResponse.SC_FORBIDDEN);s.setContentType("application/json");s.getWriter().write("{\"success\":false,\"data\":null,\"message\":\""+message+"\"}");}
 }
}
