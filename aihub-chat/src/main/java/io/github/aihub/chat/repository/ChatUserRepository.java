package io.github.aihub.chat.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface ChatUserRepository extends Repository<Object, Long> {
    @Query(value = "select id from sys_user where username = :username", nativeQuery = true)
    Optional<Long> findIdByUsername(@Param("username") String username);
}
