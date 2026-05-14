package com.omstu.agriculturefield.rotation.model.enums;

public enum RotationRecommendation {
    STRONGLY_RECOMMENDED(100, "Отличный предшественник"),
    RECOMMENDED(80, "Хороший предшественник"),
    ACCEPTABLE(60, "Допустимо с корректирующими мерами"),
    NOT_RECOMMENDED(30, "Не рекомендуется без доп. затрат"),
    FORBIDDEN(0, "Запрещено — фитосанитарный риск");

    public final int score;
    public final String agronomicRationale;

    RotationRecommendation(int score, String agronomicRationale) {
        this.score = score;
        this.agronomicRationale = agronomicRationale;
    }
}
