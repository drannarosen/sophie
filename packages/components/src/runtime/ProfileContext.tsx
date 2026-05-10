import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export type Profile = "student" | "instructor";

const ProfileContext = createContext<Profile>("student");

export function ProfileProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  return (
    <ProfileContext.Provider value={profile}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): Profile {
  return useContext(ProfileContext);
}
