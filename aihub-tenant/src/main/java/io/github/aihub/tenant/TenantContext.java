package io.github.aihub.tenant;
public final class TenantContext {
 private static final ThreadLocal<Long> CURRENT=new ThreadLocal<>();
 private TenantContext(){}
 public static Long get(){return CURRENT.get();}
 public static void set(Long id){CURRENT.set(id);}
 public static void clear(){CURRENT.remove();}
}