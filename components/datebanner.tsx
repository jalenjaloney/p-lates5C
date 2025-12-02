import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  Text, 
  TouchableOpacity, 
  Modal, 
  SafeAreaView, 
  ScrollView 
} from 'react-native';
import { AppState } from 'react-native'; // For dynamic updates
import { LinearGradient } from 'expo-linear-gradient'; // --- NEW ---

// Helper function to generate the next 7 days (this is unchanged)
const generateDateOptions = () => {
  const options = [];
  const today = new Date();
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const formattedDate = `${month}/${day}`;

    let label = '';
    if (i === 0) {
      label = `TODAY ${formattedDate}`;
    } else if (i === 1) {
      label = `TOMORROW ${formattedDate}`;
    } else {
      label = `${dayNames[date.getDay()]} ${formattedDate}`;
    }

    options.push({ label, value: date.toISOString() });
  }
  return options;
};

export default function DateBanner() {
  const [dateOptions, setDateOptions] = useState(generateDateOptions());
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);
  
  // --- NEW --- State to control our custom modal
  const [modalVisible, setModalVisible] = useState(false);

  // This useEffect (from our previous conversation) ensures the date
  // updates if the app is left open past midnight.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const newOptions = generateDateOptions();
        if (newOptions[0].value !== dateOptions[0].value) {
          setDateOptions(newOptions);
          setSelectedDate(newOptions[0].value);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [dateOptions]);

  // --- NEW --- Helper to get the display label for the banner
  const selectedOption = useMemo(() => {
    return dateOptions.find(opt => opt.value === selectedDate);
  }, [selectedDate, dateOptions]);

  // --- NEW --- Function to handle selecting an item in the modal
  const handleSelectDate = (value) => {
    setSelectedDate(value);
    setModalVisible(false);
  };

  return (
    <>
      {/* This is the new banner. 
        It's no longer a Picker, but a TouchableOpacity
        that opens our modal.
      */}
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <LinearGradient
          colors={['#D32F2F', '#B71C1C']} // Impressive gradient
          style={styles.dateBanner}
        >
          <Text style={styles.bannerText}>
            {selectedOption ? selectedOption.label : 'Select a Date'}
          </Text>
          <Text style={styles.bannerChevron}>▼</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* This is our new custom modal that replaces the old Picker.
        It slides up from the bottom.
      */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <SafeAreaView>
              <ScrollView>
                {dateOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.modalItem}
                    onPress={() => handleSelectDate(option.value)}
                  >
                    <Text style={styles.modalItemText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// --- ALL NEW STYLES ---
const styles = StyleSheet.create({
  dateBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    // Add a shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bannerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  bannerChevron: {
    color: '#fff',
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
  },
  cancelButton: {
    marginTop: 10,
    padding: 18,
    backgroundColor: '#f6f6f6',
    borderRadius: 10,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#D32F2F',
    fontSize: 18,
  },
});
// import React, { useState, useMemo } from 'react';
// import { View, StyleSheet, Platform } from 'react-native';
// import { Picker } from '@react-native-picker/picker';

// // Helper function to generate the next 7 days
// const generateDateOptions = () => {
//   const options = [];
//   const today = new Date();
//   const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

//   for (let i = 0; i < 7; i++) {
//     const date = new Date(today);
//     date.setDate(today.getDate() + i);

//     const month = date.getMonth() + 1; // getMonth() is zero-based
//     const day = date.getDate();
//     const formattedDate = `${month}/${day}`;

//     let label = '';
//     if (i === 0) {
//       label = `TODAY ${formattedDate}`;
//     } else if (i === 1) {
//       label = `TOMORROW ${formattedDate}`;
//     } else {
//       label = `${dayNames[date.getDay()]} ${formattedDate}`;
//     }

//     // The value can be the full date string or any unique identifier
//     options.push({ label, value: date.toISOString() });
//   }
//   return options;
// };

// export default function DateBanner() {
//   // Generate the date options. useMemo ensures this is only done once.
//   const dateOptions = useMemo(() => generateDateOptions(), []);
  
//   // State to hold the currently selected date value.
//   // We'll initialize it with the first option, which is today.
//   const [selectedDate, setSelectedDate] = useState(dateOptions[0].value);

//   return (
//     <View style={styles.dateBanner}>
//       <Picker
//         selectedValue={selectedDate}
//         onValueChange={(itemValue, itemIndex) => setSelectedDate(itemValue)}
//         style={styles.picker}
//         itemStyle={styles.pickerItem}
//         dropdownIconColor={'#fff'} // Changes the dropdown arrow color
//       >
//         {dateOptions.map((option) => (
//           <Picker.Item 
//             key={option.value} 
//             label={option.label} 
//             value={option.value} 
//           />
//         ))}
//       </Picker>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   dateBanner: { 
//     backgroundColor: '#C62828', 
//     // On iOS, the Picker has a default height. We adjust the container.
//     // On Android, the picker text is centered by default within the container.
//     paddingHorizontal: 10,
//     justifyContent: 'center',
//     height: Platform.OS === 'ios' ? 100 : 60,
//   },
//   picker: {
//     // On Android, the color applies to the selected item's text
//     // On iOS, this style is applied to the picker container view
//     color: '#000', 
//   },
//   pickerItem: {
//     // This style is primarily for iOS to style the items in the dropdown wheel
//     color: '#fff', // Color of items in the dropdown list
//     fontWeight: 'bold',
//     // Unfortunately, direct styling of dropdown items on Android is limited.
//     // The styling is often controlled by the OS theme.
//   },
// });