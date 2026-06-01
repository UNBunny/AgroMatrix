package com.omstu.agriculturefield.farm.repository;

import com.omstu.agriculturefield.farm.model.Farm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FarmRepository extends JpaRepository<Farm, Long> {

    Optional<Farm> findByInviteCode(String inviteCode);

    boolean existsByOwnerId(Long ownerId);
}
