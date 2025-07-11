import Array "mo:base/Array";
import Option "mo:base/Option";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";
import Float "mo:base/Float";
import Error "mo:base/Error";

actor EchoSoul {

  // ===== Data Types =====
  type Memory = {
    id: Nat;
    text: Text;
    timestamp: Int;
    tags: [Text];
    emotion: ?Text;
    imageUrl: ?Text;
    audioUrl: ?Text;
  };

  type UserProfile = {
    username: Text;
    bio: Text;
    avatar: ?Text;
    createdAt: Int;
  };

  type User = {
    profile: UserProfile;
    memories: [Memory];
    connections: [Principal];
  };

  type Result = {
    #ok: Text;
    #err: Text;
  };

  // ===== Stable Storage =====
  stable var users: [(Principal, User)] = [];
  stable var memoryCounter: Nat = 0;
  stable var userMemories: [(Principal, [Memory])] = [];
  stable var usernameIndex: [(Text, Principal)] = [];

  // ===== Runtime State =====
  let userMap = HashMap.fromIter<Principal, User>(
    users.vals(), 10, Principal.equal, Principal.hash
  );

  let memoryMap = HashMap.fromIter<Principal, [Memory]>(
    userMemories.vals(), 10, Principal.equal, Principal.hash
  );

  let usernameMap = HashMap.fromIter<Text, Principal>(
    usernameIndex.vals(), 10, Text.equal, Text.hash
  );

  // ===== Helper: Add item if not exists =====
  func addUnique(array: [Principal], item: Principal): [Principal] {
    let found = Array.find<Principal>(array, func(p) {
      Principal.equal(p, item)
    });
    switch (found) {
      case null { Array.append(array, [item]) };
      case _ { array };
    }
  };

  // ===== Core Features =====
  public shared({ caller }) func registerUser(username: Text, bio: Text, avatar: ?Text): async Result {
    let trimmedUsername = Text.trim(username, #text " ");
    let lowerUsername = Text.toLowercase(trimmedUsername);

    if (Text.size(trimmedUsername) < 3 or Text.size(trimmedUsername) > 20) {
      return #err("Username must be 3-20 characters.");
    };

    if (Text.contains(trimmedUsername, #text " ")) {
      return #err("Username cannot contain spaces.");
    };

    if (Text.size(bio) < 10 or Text.size(bio) > 500) {
      return #err("Bio must be 10-500 characters.");
    };

    // Ensure username is unique
    if (usernameMap.get(lowerUsername) != null) {
      return #err("Username already exists.");
    };

    let newUser: User = {
      profile = {
        username = trimmedUsername;
        bio;
        avatar;
        createdAt = Time.now();
      };
      memories = [];
      connections = [];
    };

    userMap.put(caller, newUser);
    memoryMap.put(caller, []);
    usernameMap.put(lowerUsername, caller);

    return #ok("Profile created successfully");
  };

  public shared({ caller }) func addMemory(
    text: Text,
    tags: [Text],
    emotion: ?Text,
    imageUrl: ?Text,
    audioUrl: ?Text
  ): async Memory {
    if (Text.size(text) < 5 or Text.size(text) > 1000) {
      throw Error.reject("Memory must be 5-1000 characters.");
    };

    let memory: Memory = {
      id = memoryCounter;
      text;
      timestamp = Time.now();
      tags = Array.filter<Text>(tags, func(t) { Text.size(t) > 0 });
      emotion;
      imageUrl;
      audioUrl;
    };

    memoryCounter += 1;

    let current = Option.get(memoryMap.get(caller), []);
    memoryMap.put(caller, Array.append(current, [memory]));

    return memory;
  };

  // ===== AI Summary (stub) =====
  public query func generateMemorySummary(principal: Principal): async ?Text {
    let memories = Option.get(memoryMap.get(principal), []);
    if (memories.size() == 0) return null;

    let texts = Array.map<Memory, Text>(memories, func(m) = m.text);
    let summary = "Here are some of the user's recent memories:\n" # Text.join("\n- ", Iter.fromArray(texts));
    return ?summary;
  };

  // ===== Social Connections =====
  public shared({ caller }) func connectWith(other: Principal): async Text {
    if (Principal.equal(caller, other)) {
      return "Cannot connect with yourself.";
    };

    switch (userMap.get(caller), userMap.get(other)) {
      case (?user1, ?user2) {
        if (Array.find<Principal>(user1.connections, func(p) { Principal.equal(p, other) }) != null) {
          return "Already connected with this user.";
        };

        let updatedUser1 = {
          user1 with connections = addUnique(user1.connections, other)
        };
        let updatedUser2 = {
          user2 with connections = addUnique(user2.connections, caller)
        };

        userMap.put(caller, updatedUser1);
        userMap.put(other, updatedUser2);

        return "Connection established successfully!";
      };
      case _ {
        return "User not found.";
      };
    };
  };

  // ===== Analytics =====
  public query func getMemoryStats(): async {
    totalUsers: Nat;
    totalMemories: Nat;
    avgMemoriesPerUser: Float;
  } {
    let totalUsers = userMap.size();
    let totalMemories = memoryCounter;
    let avg = if (totalUsers > 0) {
      Float.fromInt(Int.abs(totalMemories)) / Float.fromInt(Int.abs(totalUsers))
    } else {
      0.0
    };

    return {
      totalUsers;
      totalMemories;
      avgMemoriesPerUser = avg;
    };
  };

  // ===== User Discovery =====
  public query func getAllUsers(): async [(Principal, UserProfile)] {
    let entries = Iter.toArray(userMap.entries());
    Array.map<(Principal, User), (Principal, UserProfile)>(
      entries,
      func((p, u)) = (p, u.profile)
    );
  };

  public query func getUserProfile(principal: Principal): async ?UserProfile {
    switch (userMap.get(principal)) {
      case (?user) return ?user.profile;
      case _ return null;
    };
  };

  public query func getUserByUsername(username: Text): async ?(Principal, UserProfile) {
    let lower = Text.toLowercase(username);
    switch (usernameMap.get(lower)) {
      case (?p) {
        switch (userMap.get(p)) {
          case (?u) return ?(p, u.profile);
          case _ return null;
        };
      };
      case _ return null;
    };
  };

  // ===== Memory Access =====
  public query func getUserMemories(principal: Principal): async [Memory] {
    Option.get(memoryMap.get(principal), []);
  };

  // ===== Upgrade Hooks =====
  system func preupgrade() {
    users := Iter.toArray(userMap.entries());
    userMemories := Iter.toArray(memoryMap.entries());
    usernameIndex := Iter.toArray(usernameMap.entries());
  };

  system func postupgrade() {
    users := [];
    userMemories := [];
    usernameIndex := [];
  };
};
