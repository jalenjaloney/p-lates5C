import React from 'react'
import fraryData from '../../data/frary-raw.json';

const FaryMenuData = fraryData.EatecExchange.menu;

function FraryMenu() {
  const menuByDay = [];

  for (let i = 0; i < FaryMenuData.length; i += 1) {
    const entry = FaryMenuData[i];
    const servedate = entry['@servedate'];
    const mealName = entry['@mealperiodname'] || 'Other';
    const displayDate = servedate
      ? `${servedate.slice(0, 4)}-${servedate.slice(4, 6)}-${servedate.slice(6, 8)}`
      : 'Unknown Day';

    if (!servedate) {
      continue;
    }

    let day = menuByDay.find((item) => item.servedate === servedate);

    if (!day) {
      day = {
        servedate,
        label: displayDate,
        meals: []
      };
      menuByDay.push(day);
    }

    let meal = day.meals.find((item) => item.name === mealName);

    if (!meal) {
      meal = {
        name: mealName,
        categories: []
      };
      day.meals.push(meal);
    }

    const recipes = entry.recipes?.recipe;
    const recipeList = Array.isArray(recipes) ? recipes : recipes ? [recipes] : [];

    for (let j = 0; j < recipeList.length; j += 1) {
      const recipe = recipeList[j];

      if (!recipe || typeof recipe !== 'object') {
        continue;
      }

      const categoryName = (recipe['@category'] || 'Miscellaneous').trim() || 'Miscellaneous';
      let category = meal.categories.find((item) => item.name === categoryName);

      if (!category) {
        category = {
          name: categoryName,
          items: []
        };
        meal.categories.push(category);
      }

      const description = recipe['@description'] && recipe['@description'].trim();

      if (description && !category.items.includes(description)) {
        category.items.push(description);
      }
    }
  }

  return (
    <div className="frary-menu">
      <h1>Frary</h1>
      {menuByDay.map((day) => (
        <details className="frary-menu__day" key={day.servedate}>
          <summary>{day.label}</summary>

          {day.meals.map((meal) => (
            <details className="frary-menu__meal" key={`${day.servedate}-${meal.name}`}>
              <summary>{meal.name}</summary>

              {meal.categories.map((category) => (
                <details className="frary-menu__category" key={`${day.servedate}-${meal.name}-${category.name}`}>
                  <summary>{category.name}</summary>
                  <ul>
                    {category.items.map((item) => (
                      <li key={`${day.servedate}-${meal.name}-${category.name}-${item}`}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </details>
          ))}
        </details>
      ))}
    </div>
  )
}

const Dashboard = () => {

  return (
    <div>
      Dashboard
      <FraryMenu />
    </div>
  )
}

export default Dashboard
