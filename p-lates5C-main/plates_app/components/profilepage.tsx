import React, { useState } from "react";
import { View, Image, Text, StyleSheet, TouchableOpacity } from "react-native";

type User = {
  username: string;
  currentUserId: string; // The logged-in user's ID
  name: string;
  college?: string;
  followers: number;
  following: number;
  profilePicture?: string;
  isFollowing?: boolean;
};

type ProfilePageProps = {
  user: User;
};

export default function ProfilePage({ user }: ProfilePageProps) {
  const isOwnProfile = user.username === user.currentUserId;

  const [isFollowing, setIsFollowing] = useState(user.isFollowing ?? false);

  const handleFollowToggle = () => {
    // TODO: connect to backend
    setIsFollowing(!isFollowing);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.username}>@{user.username}</Text>
      <Image
        source={
          user.profilePicture
            ? typeof user.profilePicture === "string"
              ? { uri: user.profilePicture }
              : user.profilePicture
            : require("@/assets/images/empty-profile-photo.webp")
        }
        style={styles.profileImage}
      />

      <Text style={styles.name}>{user.name}</Text>
      {user.college && <Text style={styles.college}>{user.college}</Text>}

      {/* TODO change these to link to followers/following list */}
      <View style={styles.statsContainer}>
        <View style={styles.followersContainer}>
          <Text style={styles.statsNumber}>{user.followers}</Text>
          <Text style={styles.statsText}>Followers</Text>
        </View>
        <View style={styles.followersContainer}>
          <Text style={styles.statsNumber}>{user.following}</Text>
          <Text style={styles.statsText}>Following</Text>
        </View>
      </View>

      {/* conditionally render follow button depending on if its users own profile */}
      {!isOwnProfile && (
        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={handleFollowToggle}
        >
          <Text style={styles.followButtonText}>
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 50,
  },
  username: {
    fontSize: 16,
    color: "#555",
    marginBottom: 16,
    textAlign: "left",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },

  name: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  college: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  followersContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: "600",
  },
  statsText: {
    fontSize: 16,
    color: "#666",
  },
  followButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    width: 175,
    borderRadius: 10,
    marginTop: 16,
  },
  followingButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#666",
    paddingVertical: 8,
    width: 175,
    borderRadius: 10,
    marginTop: 16,
  },
  followButtonText: {
    textAlign: "center",
    fontWeight: "600",
  },
});
