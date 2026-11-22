package com.fishcaring;

import com.fishcaring.enums.RepeatType;
import com.fishcaring.enums.TaskType;
import com.fishcaring.object.CareTaskData;
import com.fishcaring.object.TankData;
import com.fishcaring.repository.CareLogRepository;
import com.fishcaring.repository.CareTaskRepository;
import com.fishcaring.repository.NotificationRepository;
import com.fishcaring.repository.PushSubscriptionRepository;
import com.fishcaring.repository.TankFishRepository;
import com.fishcaring.repository.TankRepository;
import com.fishcaring.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Base class for repository tests: runs the real Flyway migrations on H2 (MODE=MySQL), rolls back
 * after every test, and offers helpers to create sample rows.
 */
@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
        UserRepository.class,
        TankRepository.class,
        TankFishRepository.class,
        CareTaskRepository.class,
        CareLogRepository.class,
        NotificationRepository.class,
        PushSubscriptionRepository.class
})
public abstract class RepositoryTestSupport {

    protected static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 21, 8, 0, 0);

    @Autowired
    protected JdbcClient jdbc;
    @Autowired
    protected UserRepository users;
    @Autowired
    protected TankRepository tanks;
    @Autowired
    protected TankFishRepository fish;
    @Autowired
    protected CareTaskRepository tasks;
    @Autowired
    protected CareLogRepository logs;
    @Autowired
    protected NotificationRepository notifications;
    @Autowired
    protected PushSubscriptionRepository pushSubscriptions;

    protected long newUser(String email) {
        return users.insert(email, "hash", "User " + email, NOW);
    }

    protected long newTank(long userId, String name) {
        return tanks.insert(userId, TankData.builder().name(name).volumeLiters(new BigDecimal("60.0")).build(), NOW);
    }

    /** Task data for a general task (no tank). */
    protected CareTaskData taskData(String title) {
        return taskData(null, title);
    }

    protected CareTaskData taskData(Long tankId, String title) {
        return new CareTaskData(tankId, TaskType.FEED, title, null, RepeatType.DAILY, null,
                LocalTime.of(8, 0), null, null, null, null, true, NOW.plusDays(1));
    }

    /** A task of the tank, owned by the tank's owner. */
    protected long newTask(long tankId, String title) {
        long userId = jdbc.sql("SELECT user_id FROM tanks WHERE id = :id").param("id", tankId)
                .query(Long.class).single();
        return tasks.insert(userId, taskData(tankId, title), NOW);
    }

    protected long newGeneralTask(long userId, String title) {
        return tasks.insert(userId, taskData(title), NOW);
    }

    protected int count(String table) {
        return jdbc.sql("SELECT COUNT(*) FROM " + table).query(Integer.class).single();
    }
}
