import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const hasGoogleAuth =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  providers: hasGoogleAuth
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
      ]
    : [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as any).id = String(token.userId);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const isGoogleAuthConfigured = hasGoogleAuth;
