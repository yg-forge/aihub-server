package io.github.aihub.tenant;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;

/**
 * Legacy servlet filter retained for compatibility. Tenant security is now
 * enforced by the Spring Security filter chain in aihub-bootstrap.
 */
public class TenantFilter implements Filter {
  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
      throws IOException, ServletException {
    chain.doFilter(req, res);
  }
}
