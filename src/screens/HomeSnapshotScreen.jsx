import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import DateBanner from '../../components/datebanner';
import DiningHallSection from '../../components/dininghallsection';
import DishItem from '../../components/dishitem';
import Header from '../../components/header';
import MealSection from '../../components/mealsection';

// Hard-coded snapshot for demo purposes, modeled after p-lates5c-main index page.
const HomeSnapshotScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header />
      <DateBanner />

      <MealSection title="Breakfast" />
      <MealSection title="Lunch" />

      <MealSection title="Dinner">
        <DiningHallSection dininghall="Hoch" color="#E6C229">
          <DishItem dish="Potstickers" rating={5} interactive={false} />
          <DishItem dish="Pizza" rating={3} interactive={false} />
        </DiningHallSection>

        <DiningHallSection dininghall="McConnell" color="#F17105">
          <DishItem dish="Taco Tuesday" rating={5} interactive={false} />
        </DiningHallSection>

        <DiningHallSection dininghall="Collins" color="#D11149">
          <DishItem dish="Poke Bowls" rating={5} interactive={false} />
          <DishItem dish="Pasta Bar" rating={3} interactive={false} />
        </DiningHallSection>

        <DiningHallSection dininghall="Malott" color="#007F5F">
          <DishItem dish="Quesadillas" rating={5} interactive={false} />
        </DiningHallSection>

        <DiningHallSection dininghall="Frary" color="#4361EE">
          <DishItem dish="Baked Potato" rating={5} interactive={false} />
          <DishItem dish="Shanghai Chicken Wraps" rating={4} interactive={false} />
        </DiningHallSection>

        <DiningHallSection dininghall="Frank" color="#4361EE">
          <DishItem dish="Omelette Bar" rating={5} interactive={false} />
        </DiningHallSection>
      </MealSection>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 16 },
});

export default HomeSnapshotScreen;
