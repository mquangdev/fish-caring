package com.fishcaring.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fishcaring.RepositoryTestSupport;
import com.fishcaring.entity.UserEntity;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

class UserRepositoryTest extends RepositoryTestSupport {

    @Test
    void insertThenFindByEmailAndId() {
        long id = users.insert("a@example.com", "hash", "Alice", NOW);

        UserEntity byEmail = users.findByEmail("a@example.com").orElseThrow();
        assertThat(byEmail.getId()).isEqualTo(id);
        assertThat(byEmail.getDisplayName()).isEqualTo("Alice");
        assertThat(byEmail.getCreatedAt()).isEqualTo(NOW);
        assertThat(byEmail.getUpdatedAt()).isEqualTo(NOW);
        assertThat(users.findById(id)).isPresent();
        assertThat(users.existsByEmail("a@example.com")).isTrue();
        assertThat(users.existsByEmail("nobody@example.com")).isFalse();
    }

    @Test
    void duplicateEmailIsRejected() {
        users.insert("a@example.com", "hash", "Alice", NOW);

        assertThatThrownBy(() -> users.insert("a@example.com", "hash2", "Other", NOW))
                .isInstanceOf(DuplicateKeyException.class);
    }
}
