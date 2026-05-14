package com.omstu.agriculturefield.disease.model.enums;

import lombok.Getter;

@Getter
public enum SupportedCrop {
    WHEAT("пшеница"),
    WINTER_WHEAT("пшеница озимая"),
    SPRING_WHEAT("пшеница яровая"),
    BARLEY("ячмень"),
    CORN("кукуруза"),
    SUNFLOWER("подсолнечник"),
    SOY("соя"),
    RAPESEED("рапс"),
    PEAS("горох"),
    FLAX("лён"),
    BUCKWHEAT("гречиха"),
    LENTIL("чечевица"),
    POTATO("картофель"),
    OATS("овёс");

    private final String russianName;

    SupportedCrop(String russianName) {
        this.russianName = russianName;
    }

    public static SupportedCrop fromRussianName(String russianName) {
        if (russianName == null) {
            return WHEAT;
        }
        
        String normalized = russianName.trim().toLowerCase();
        for (SupportedCrop crop : values()) {
            if (crop.russianName.equalsIgnoreCase(normalized)) {
                return crop;
            }
        }
        
        throw new IllegalArgumentException(
            "Неподдерживаемая культура: '" + russianName + "'. " +
            "Поддерживаемые культуры: пшеница, пшеница озимая, пшеница яровая, ячмень, кукуруза, подсолнечник, соя, рапс, горох, лён, гречиха, чечевица, картофель, овёс"
        );
    }

    public static boolean isSupported(String russianName) {
        if (russianName == null) {
            return false;
        }
        
        String normalized = russianName.trim().toLowerCase();
        for (SupportedCrop crop : values()) {
            if (crop.russianName.equalsIgnoreCase(normalized)) {
                return true;
            }
        }
        return false;
    }
}
