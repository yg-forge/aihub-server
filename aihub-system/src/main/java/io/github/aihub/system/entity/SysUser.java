package io.github.aihub.system.entity;
import jakarta.persistence.*;
@Entity @Table(name="sys_user")
public class SysUser {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false,unique=true) public String username;
 @Column(nullable=false) public String passwordHash;
 @Column(nullable=false) public String role="USER";
 @Column(nullable=false) public Long tenantId=1L;
}