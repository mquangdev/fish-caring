package com.fishcaring.enums;

/** Stored as a number in {@code tank_fish.status}: 1 = alive, 0 = dead. */
public enum FishStatus {
    DEAD(0),
    ALIVE(1);

    private final int code;

    FishStatus(int code) {
        this.code = code;
    }

    public int code() {
        return code;
    }

    public static FishStatus fromCode(int code) {
        for (FishStatus status : values()) {
            if (status.code == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown fish status code: " + code);
    }
}
