package io.github.aihub.tenant;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class TenantFilter implements Filter {
 public void doFilter(ServletRequest req,ServletResponse res,FilterChain chain)throws IOException,ServletException{
  HttpServletRequest request=(HttpServletRequest)req;
  HttpServletResponse response=(HttpServletResponse)res;
  Authentication auth=SecurityContextHolder.getContext().getAuthentication();
  try {
   if(auth!=null&&auth.isAuthenticated()&&!(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)){
    Object details=auth.getDetails();
    if(!(details instanceof Number)){
     response.setStatus(HttpServletResponse.SC_FORBIDDEN);
     response.setContentType("application/json");
     response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Tenant context is missing\"}");
     return;
    }
    Long tenantId=((Number)details).longValue();
    String header=request.getHeader("X-Tenant-Id");
    if(header!=null&&!header.isBlank()&&!header.equals(tenantId.toString())){
     response.setStatus(HttpServletResponse.SC_FORBIDDEN);
     response.setContentType("application/json");
     response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Tenant mismatch\"}");
     return;
    }
    TenantContext.set(tenantId);
   }
   chain.doFilter(req,res);
  } finally { TenantContext.clear(); }
 }
}
