package com.fishcaring;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class FlywayMigrationTest extends RepositoryTestSupport {

    private static final List<String> TABLES = List.of(
            "users", "tanks", "tank_fish", "care_tasks", "care_logs", "notifications", "push_subscriptions");

    @Test
    void everyTableExistsAndHasCreatedAtAndUpdatedAt() {
        for (String table : TABLES) {
            List<String> columns = jdbc.sql("""
                    SELECT LOWER(column_name) FROM information_schema.columns
                    WHERE LOWER(table_name) = :table
                    """)
                    .param("table", table)
                    .query(String.class)
                    .list();
            assertThat(columns).as("columns of " + table).contains("id", "created_at", "updated_at");
        }
    }

    @Test
    void usersHasNoTimezoneAndTanksHasNoNameLower() {
        assertThat(columnsOf("users")).doesNotContain("timezone");
        assertThat(columnsOf("tanks")).doesNotContain("name_lower");
        assertThat(columnsOf("tank_fish")).contains("status");
    }

    @Test
    void tanksHaveDimensionsAndNoType() {
        assertThat(columnsOf("tanks")).doesNotContain("type");
        assertThat(columnsOf("tanks")).contains("volume_liters", "length_cm", "width_cm", "height_cm");
    }

    @Test
    void tankVolumeAndDimensionsAreDecimalsWithOneFractionDigit() {
        for (String column : List.of("volume_liters", "length_cm", "width_cm", "height_cm")) {
            Integer scale = jdbc.sql("""
                    SELECT numeric_scale FROM information_schema.columns
                    WHERE LOWER(table_name) = 'tanks' AND LOWER(column_name) = :column
                    """)
                    .param("column", column)
                    .query(Integer.class)
                    .single();
            assertThat(scale).as(column + " scale").isEqualTo(1);
        }
    }

    private List<String> columnsOf(String table) {
        return jdbc.sql("SELECT LOWER(column_name) FROM information_schema.columns WHERE LOWER(table_name) = :table")
                .param("table", table)
                .query(String.class)
                .list();
    }
}
