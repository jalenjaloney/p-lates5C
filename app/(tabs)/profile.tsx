import React from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

// Hard-coded until backend integration
const user = {
  username: "johndoe47",
  currentUserId: "chirpchirp",
  name: "John Doe",
  college: "Pomona",
  followers: 128,
  following: 210,
  profilePicture: "", // no image → fallback will be used
  isFollowing: false,
};

export default function Profile() {
  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={
            user.profilePicture
              ? { uri: user.profilePicture }
              : require("@/assets/images/empty-profile-photo.webp")
          }
          style={styles.avatar}
        />

        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.college}>{user.college}</Text>
      </View>

      {/* Followers / Following */}
      <View style={styles.statsContainer}>
        <Link
          href={{ pathname: "/social", params: { initialRoute: "followers" } }}
          asChild
        >
          <TouchableOpacity style={styles.statBox}>
            <Text style={styles.statCount}>{user.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
        </Link>

        <Link
          href={{ pathname: "/social", params: { initialRoute: "following" } }}
          asChild
        >
          <TouchableOpacity style={styles.statBox}>
            <Text style={styles.statCount}>{user.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Extra Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: 40, backgroundColor: "white" },

  header: { alignItems: "center", marginBottom: 25 },

  avatar: {
    width: 95,
    height: 95,
    borderRadius: 50,
    backgroundColor: "#e5e5e5",
    marginBottom: 12,
  },

  name: { fontSize: 22, fontWeight: "bold" },
  username: { marginTop: 4, fontSize: 16, color: "gray" },
  college: { marginTop: 2, fontSize: 15, color: "#888" },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 25,
  },

  statBox: { alignItems: "center", marginHorizontal: 25 },
  statCount: { fontSize: 20, fontWeight: "bold" },
  statLabel: { fontSize: 15, color: "gray", marginTop: 4 },

  actions: { marginTop: 15 },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
  },
  actionText: { fontSize: 16, fontWeight: "500" },
});
