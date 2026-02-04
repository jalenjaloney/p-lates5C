import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import { AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '@/constants/tokens';
import { useTheme } from '@/hooks/useTheme';

type DateBannerProps = {
  selectedDate: string;
  onChange: (dateIso: string) => void;
};

const formatLabel = (date: Date, indexFromToday?: number) => {
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const formattedDate = `${month}/${day}`;

  if (typeof indexFromToday === 'number') {
    if (indexFromToday === 0) return `TODAY ${formattedDate}`;
    if (indexFromToday === 1) return `TOMORROW ${formattedDate}`;
  }

  return `${dayNames[date.getDay()]} ${formattedDate}`;
};

const generateFutureOptions = () => {
  const options = [] as { label: string; value: string }[];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    options.push({ label: formatLabel(date, i), value: date.toISOString() });
  }

  return options;
};

export default function DateBanner({ selectedDate, onChange }: DateBannerProps) {
  const { colors } = useTheme();
  const [futureOptions, setFutureOptions] = useState(generateFutureOptions());
  const [modalVisible, setModalVisible] = useState(false);
  const [pastCount, setPastCount] = useState(7);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const newOptions = generateFutureOptions();
        if (newOptions[0].value !== futureOptions[0].value) {
          setFutureOptions(newOptions);
          onChange(newOptions[0].value);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [futureOptions, onChange]);

  const pastOptions = useMemo(() => {
    const options: { label: string; value: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= pastCount; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      options.push({ label: formatLabel(date), value: date.toISOString() });
    }
    return options;
  }, [pastCount]);

  const selectedOption = useMemo(() => {
    const all = [...futureOptions, ...pastOptions];
    const selected = all.find((opt) => opt.value.slice(0, 10) === selectedDate.slice(0, 10));
    if (selected) return selected;
    return { label: formatLabel(new Date(selectedDate)), value: selectedDate };
  }, [selectedDate, futureOptions, pastOptions]);

  const handleSelectDate = (value: string) => {
    onChange(value);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.dateBannerContainer}>
        <View style={[styles.dateBanner, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
          <Text style={[styles.bannerText, { color: colors.ink, fontFamily: tokens.font.mono }]}>
            {selectedOption.label}
          </Text>
          <Text style={[styles.bannerChevron, { color: colors.inkMuted }]}>▼</Text>
        </View>
      </TouchableOpacity>

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
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SafeAreaView>
              <ScrollView>
                <Text style={[styles.sectionLabel, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                  Upcoming
                </Text>
                {futureOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectDate(option.value)}
                  >
                    <Text style={[styles.modalItemText, { color: colors.ink, fontFamily: tokens.font.body }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.sectionLabel, { color: colors.inkMuted, fontFamily: tokens.font.body }]}>
                  Past
                </Text>
                {pastOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectDate(option.value)}
                  >
                    <Text style={[styles.modalItemText, { color: colors.ink, fontFamily: tokens.font.body }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.loadMore, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
                  onPress={() => setPastCount((prev) => prev + 14)}
                >
                  <Text style={[styles.loadMoreText, { color: colors.ink }]}>Load more past dates</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.accent }]}>Cancel</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dateBannerContainer: {
    paddingHorizontal: 0,
  },
  dateBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  bannerText: {
    fontWeight: '400',
    fontSize: tokens.fontSize.caption,
    letterSpacing: tokens.letterSpacing.wider,
  },
  bannerChevron: {
    fontSize: tokens.fontSize.caption,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: tokens.radius.xxl,
    borderTopRightRadius: tokens.radius.xxl,
    padding: tokens.space.lg,
    maxHeight: '70%',
    borderTopWidth: 1,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.tiny,
    letterSpacing: tokens.letterSpacing.wide,
    marginTop: tokens.space.xs,
    marginBottom: tokens.space.xs,
  },
  modalItem: {
    paddingVertical: tokens.space.md,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
  },
  loadMore: {
    marginTop: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  loadMoreText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: tokens.space.sm,
    padding: tokens.space.lg,
    borderRadius: tokens.radius.lg,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: tokens.fontSize.h3,
  },
});
