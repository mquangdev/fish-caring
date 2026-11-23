package com.fishcaring.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fishcaring.service.VapidKeys;
import org.junit.jupiter.api.Test;

class AppPropertiesTest {

    private static final AppProperties.Jwt JWT = new AppProperties.Jwt("s".repeat(32), 7);
    private static final String SUBJECT = "mailto:admin@example.com";

    @Test
    void withoutVapidSettingsWebPushIsOff() {
        assertThat(new AppProperties("http://localhost:5173", JWT, null).vapidKeys()).isEmpty();
        // the application.yml gives empty strings when the variables are not set
        assertThat(new AppProperties("http://localhost:5173", JWT, new AppProperties.Vapid("", "", "")).vapidKeys()).isEmpty();
        assertThat(new AppProperties("http://localhost:5173", JWT, new AppProperties.Vapid(null, "  ", null)).vapid()).isNull();
    }

    @Test
    void aValidPairWithASubjectTurnsWebPushOn() {
        String[] pair = VapidKeys.generate();

        AppProperties properties = new AppProperties("http://localhost:5173", JWT,
                new AppProperties.Vapid(pair[0], pair[1], SUBJECT));

        assertThat(properties.vapidKeys()).isPresent();
        assertThat(properties.vapidKeys().orElseThrow().publicKeyBase64Url()).isEqualTo(pair[0]);
        assertThat(new AppProperties.Vapid(pair[0], pair[1], "https://example.com/contact")).isNotNull();
    }

    @Test
    void settingOnlySomeOfTheThreeStopsTheStart() {
        String[] pair = VapidKeys.generate();

        assertThatThrownBy(() -> new AppProperties.Vapid(pair[0], "", SUBJECT)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new AppProperties.Vapid("", pair[1], SUBJECT)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new AppProperties.Vapid(pair[0], pair[1], "")).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void aSubjectThatIsNotAMailtoOrHttpsAddressStopsTheStart() {
        String[] pair = VapidKeys.generate();

        assertThatThrownBy(() -> new AppProperties.Vapid(pair[0], pair[1], "admin@example.com"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("VAPID_SUBJECT");
        assertThatThrownBy(() -> new AppProperties.Vapid(pair[0], pair[1], "http://example.com"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void keysThatAreWrongOrNotAPairStopTheStart() {
        String[] one = VapidKeys.generate();
        String[] two = VapidKeys.generate();

        assertThatThrownBy(() -> new AppProperties.Vapid(one[0], two[1], SUBJECT)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new AppProperties.Vapid("garbage", one[1], SUBJECT)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void theJwtSettingsAreStillRequired() {
        assertThatThrownBy(() -> new AppProperties("http://localhost:5173", null, null)).isInstanceOf(IllegalStateException.class);
    }
}
