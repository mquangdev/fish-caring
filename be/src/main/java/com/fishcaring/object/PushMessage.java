package com.fishcaring.object;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/** What the service worker shows: title, text, the page to open and a tag that replaces an older message. */
@Getter
@AllArgsConstructor
@Builder
public class PushMessage {

    private final String title;
    private final String body;
    private final String url;
    private final String tag;
}
