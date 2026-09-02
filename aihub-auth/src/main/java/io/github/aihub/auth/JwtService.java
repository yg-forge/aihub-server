package io.github.aihub.auth;
import io.jsonwebtoken.*;import io.jsonwebtoken.security.Keys;import java.nio.charset.StandardCharsets;import java.time.*;import java.util.*;import javax.crypto.SecretKey;
public class JwtService {
 private final SecretKey key;
 public JwtService(String secret){this.key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));}
 public String issue(String username,Collection<String> roles){return Jwts.builder().subject(username).claim("roles",roles).issuedAt(new Date()).expiration(Date.from(Instant.now().plus(Duration.ofHours(8)))).signWith(key).compact();}
 public Jws<Claims> parse(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);}
}