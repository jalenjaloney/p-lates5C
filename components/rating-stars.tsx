import React, { useRef } from "react";
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { UI } from "@/constants/ui";

type RatingStarsProps = {
  rating: number; // current rating 0-5
  onRatingChange?: (newRating: number) => void; // callback when rating changes
  interactive?: boolean;
};

export default function RatingStars({ rating, onRatingChange, interactive = true }: RatingStarsProps) {
  const containerWidth = useRef(0);

  // Capture the width of the star container
  const onLayout = (event: LayoutChangeEvent) => {
    containerWidth.current = event.nativeEvent.layout.width;
  };

  // swipe/drag detection
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactive,
      onPanResponderGrant: (evt) => {
        if (!interactive || !onRatingChange) return;
        handleTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        if (!interactive || !onRatingChange) return;
        handleTouch(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const handleTouch = (x: number) => {
    if (containerWidth.current === 0) return;

    const relativeX = Math.max(0, Math.min(x, containerWidth.current)); // clamp
    const newRating = (relativeX / containerWidth.current) * 5;
    const roundedRating = Math.round(newRating * 2) / 2; // round to nearest 0.5
    onRatingChange(roundedRating);
  };

  const getStarIcon = (index: number) => {
    if (rating >= index + 1) return "star"; // full
    if (rating >= index + 0.5) return "star-half-full"; // half
    return "star-o"; // empty
  };

  return (
    <View
      style={styles.stars}
    onLayout={onLayout}
      {...(interactive ? panResponder.panHandlers : {})} // enable swipe/drag if interactive
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <FontAwesome
          key={i}
          name={getStarIcon(i)}
          size={16}
          color={getStarIcon(i) == "star-o" ? UI.colors.border : UI.colors.accentWarm}
          style={styles.starIcon}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stars: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 90,
  },
  starIcon: {
    marginHorizontal: 2,
  },
});
