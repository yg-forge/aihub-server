package io.github.aihub.tenant;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class TenantFilter implements Filter {
 public void doFilter(ServletRequest req,ServletResponse res,FilterChain chain)throws IOException,ServletException{
  Authentication auth=SecurityContextHolder.getContext().getAuthentication();
  try {
   if(auth!=null&&auth.isAuthenticated()&&!(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)){
    Object details=auth.getDetails();
    if(details instanceof Number tenantId) TenantContext.set(tenantId.longValue());
   }
   chain.doFilter(req,res);
  } finally { TenantContext.clear(); }
 }
}
