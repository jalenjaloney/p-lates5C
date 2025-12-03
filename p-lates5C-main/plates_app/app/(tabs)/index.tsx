import { Image } from 'expo-image';
import { Platform, StyleSheet, ScrollView } from 'react-native';

import Header from '@/components/header';
import DateBanner from '@/components/datebanner';
import MealSection from '@/components/mealsection';
import DishItem from '@/components/dishitem';
import RateDishButton from '@/components/ratedish';
import DiningHallSection from '@/components/dininghallsection';
import RatingStars from '@/components/rating-stars';

export default function HomeScreen() {
  return (
  <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 16 }}>
    <Header />
    <DateBanner />

    <MealSection title="Breakfast" />
    <MealSection title="Lunch" />
    
    <MealSection title="Dinner">
      
      <DiningHallSection dininghall="Hoch" color="#E6C229">
        <DishItem dish="Potstickers" rating={5}  />
        <DishItem dish="Pizza" rating={3} />
      </DiningHallSection>

      <DiningHallSection dininghall="McConnel" color="#F17105">
        <DishItem dish="Taco Tuesday" rating={5}  />
      </DiningHallSection>

      <DiningHallSection dininghall="Collins" color="#D11149">
        <DishItem dish="Poke Bowls" rating={5}  />
        <DishItem dish="Pasta Bar" rating={3} />
      </DiningHallSection>

      <DiningHallSection dininghall="Malott" color="#007F5F">
        <DishItem dish="Quesadillas" rating={5}  />
      </DiningHallSection>

      <DiningHallSection dininghall="Frary" color="#4361EE">
        <DishItem dish="Baked Potato" rating={5}  />
        <DishItem dish="Shanghai Chicken Wraps" rating={4} />
      </DiningHallSection>

      <DiningHallSection dininghall="Frank" color="#4361EE">
        <DishItem dish="Omelette Bar" rating={5}  />
      </DiningHallSection>
   
    </MealSection>

    <RateDishButton />
  </ScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
