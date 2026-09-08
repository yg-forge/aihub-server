package io.github.aihub.chat.repository;

import io.github.aihub.chat.model.SysUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ChatUserRepository extends JpaRepository<SysUser, Long> {
    Optional<SysUser> findByUsername(String username);
}
