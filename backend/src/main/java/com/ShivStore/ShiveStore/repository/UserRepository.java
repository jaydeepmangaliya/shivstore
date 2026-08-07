package com.ShivStore.ShiveStore.repository;

import com.ShivStore.ShiveStore.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    /** Look up a user by their email address (the login identifier). */
    Optional<User> findByEmail(String email);

    /** Check if an email is already registered. */
    boolean existsByEmail(String email);
}
