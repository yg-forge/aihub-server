package io.github.aihub.system.repo;
import io.github.aihub.system.entity.SysUser;import java.util.*;import org.springframework.data.jpa.repository.JpaRepository;
public interface SysUserRepository extends JpaRepository<SysUser,Long>{Optional<SysUser> findByUsername(String username);}