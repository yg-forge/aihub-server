package io.github.aihub.tenant;
import jakarta.servlet.*;import jakarta.servlet.http.*;import java.io.IOException;
public class TenantFilter implements Filter {
 public void doFilter(ServletRequest req,ServletResponse res,FilterChain chain)throws IOException,ServletException{
  String h=((HttpServletRequest)req).getHeader("X-Tenant-Id");
  try { if(h!=null&&!h.isBlank()) TenantContext.set(Long.parseLong(h)); chain.doFilter(req,res); }
  finally { TenantContext.clear(); }
 }
}