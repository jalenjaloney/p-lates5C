import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import RatingStars from "./rating-stars";

type DishItemProps = {
  dish: string;
  rating: number;
};

export default function DishItem({
  dish,
  rating,

}: DishItemProps) {

  const [currentRating, setRating] = React.useState(rating);

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    // can send new rating to backend here
  };

  return (
    <View style={styles.dishItem}>
      <View style={{ flexDirection: "column", flex: 1 }}>
        <Text style={styles.dishName}>{dish}</Text>
      </View>
      <RatingStars rating={currentRating} onRatingChange = {handleRatingChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  dishItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    alignItems: "center",
  },
  dishName: { fontSize: 14, marginTop: 3 },
  stars: { flexDirection: "row" },
});
