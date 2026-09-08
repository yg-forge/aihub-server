package io.github.aihub.chat.model;

import jakarta.persistence.*;

@Entity
@Table(name = "sys_user")
public class SysUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String username;

    public Long getId() { return id; }
    public String getUsername() { return username; }
}
