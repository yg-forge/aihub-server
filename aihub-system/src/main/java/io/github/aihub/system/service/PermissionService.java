package io.github.aihub.system.service;
import org.springframework.security.core.Authentication;import org.springframework.stereotype.Service;
@Service("permissionService")
public class PermissionService {
 public boolean has(Authentication a,String permission){
  if(a==null||!a.isAuthenticated()) return false;
  return a.getAuthorities().stream().anyMatch(x->x.getAuthority().equals("ROLE_SUPER_ADMIN")||x.getAuthority().equals(permission));
 }
}