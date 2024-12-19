"use client";

import { deleteAccountAction, updateUserAction } from "@/actions/user-actions";
import {
  AuthFormMessage,
  AuthMessage,
} from "@/components/auth/auth-form-message";
import ChangeDataInput from "@/components/globals/change-data-input";
import { useUser } from "@/components/providers/user-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { forgotPasswordAction, signOutAction } from "@/actions/auth-actions";
import { AnimatePresence } from "motion/react";
import { AlertDialog } from "@/components/globals/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
  const { data, setData } = useUser();
  const searchParams = useSearchParams();

  const { toast } = useToast();

  // mutation handlers
  const { mutate: mutateName, isPending: isPendingName } = useMutation({
    mutationKey: ["updateUserName"],
    mutationFn: (name: string) => updateUserAction({ name }),
    onSuccess: (result) => {
      setData((state) => ({ ...state!, user: result.newUser }));
      setNameMessage({ success: "Name updated successfully" });
    },
    onError: (error) => {
      setNameMessage({ error: error.message });
    },
  });

  const { mutate: mutateEmail, isPending: isPendingEmail } = useMutation({
    mutationKey: ["updateUserEmail"],
    mutationFn: (email: string) => updateUserAction({ email }),
    onSuccess: (result) => {
      setData((state) => ({ ...state!, user: result.newUser }));
      setEmailMessage({ success: "Check your email for a verification link" });
    },
    onError: (error) => {
      setEmailMessage({ error: error.message });
    },
  });

  const { mutate: mutateDeleteAccount, isPending: isPendingDeleteAccount } =
    useMutation({
      mutationKey: ["deleteAccount"],
      mutationFn: deleteAccountAction,
      onSuccess: () => {
        setDeleteConfirmDialogOpen(false);

        toast({
          title: "Account deleted",
          description: "You have been signed out",
        });

        signOutAction();
      },
      onError: (error) => {
        setDeleteMessage({ error: error.message });
      },
    });

  // states
  const [name, setName] = useState<string>(
    data?.user?.user_metadata?.name || "",
  );
  const [email, setEmail] = useState(
    searchParams.get("new_email") || data?.user?.email || "",
  );

  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>("");

  const [nameMessage, setNameMessage] = useState<AuthMessage | null>(null);
  const [emailMessage, setEmailMessage] = useState<AuthMessage | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<AuthMessage | null>(
    null,
  );
  const [deleteMessage, setDeleteMessage] = useState<AuthMessage | null>(null);

  // email redirect message / state handler
  useEffect(() => {
    if (
      !searchParams.has("success") &&
      !searchParams.has("error") &&
      !searchParams.has("type")
    )
      return;

    if (searchParams.get("type") === "update_email") {
      if (searchParams.has("success")) {
        if (searchParams.has("new_email")) {
          // we update the user state with the new email if things went well
          // -> user object will be refetched from server on page reload

          setData((state) => ({
            ...state!,
            user: { ...state!.user!, email: searchParams.get("new_email")! },
          }));
        }

        setEmailMessage({
          success: decodeURIComponent(searchParams.get("success")!),
        });
      } else {
        setEmailMessage({
          error: decodeURIComponent(searchParams.get("error")!),
        });
      }
    } else if (searchParams.get("type") === "reset_password") {
      setPasswordMessage(
        searchParams.has("success")
          ? {
              success: decodeURIComponent(searchParams.get("success")!),
            }
          : {
              error: decodeURIComponent(searchParams.get("error")!),
            },
      );
    }
  }, [searchParams]);

  // timeouts to clear messages after 5 seconds
  useEffect(() => {
    if (!nameMessage) return;

    const timeout = setTimeout(() => {
      setNameMessage(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [nameMessage]);

  useEffect(() => {
    if (!emailMessage) return;

    const timeout = setTimeout(() => {
      setEmailMessage(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [emailMessage]);

  useEffect(() => {
    if (!passwordMessage) return;

    const timeout = setTimeout(() => {
      setPasswordMessage(null);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [passwordMessage]);

  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Account</h1>
      <Card hideUnderline>
        <CardHeader>
          <CardTitle>Your Name</CardTitle>
          <CardDescription>
            Change your name to display on your invoices and receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ChangeDataInput
            placeholder="Name"
            className="w-[17rem]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            hasChanges={name !== data.user?.user_metadata?.name}
            onSave={() => {
              if (!z.string().min(1).safeParse(name).success) {
                setNameMessage({ error: "Name cannot be empty" });
                return;
              }

              mutateName(name);
            }}
            isLoading={isPendingName}
          />

          <AnimatePresence initial={false} mode="wait">
            {nameMessage && (
              <AuthFormMessage message={nameMessage} className="mt-4" />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Card hideUnderline>
        <CardHeader>
          <CardTitle>Your Email</CardTitle>
          <CardDescription>
            Change your email to receive notifications and updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ChangeDataInput
            placeholder="Email"
            className="w-[25rem]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hasChanges={email !== data.user?.email}
            onSave={() => {
              if (!z.string().email().safeParse(email).success) {
                setEmailMessage({ error: "Invalid email" });
                return;
              }

              mutateEmail(email);
            }}
            isLoading={isPendingEmail}
          />

          <AnimatePresence initial={false} mode="wait">
            {emailMessage && (
              <AuthFormMessage message={emailMessage} className="mt-4" />
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="flex gap-6">
        {data.user?.app_metadata?.providers?.includes("email") && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Your Password</CardTitle>
              <CardDescription>
                Change your account password used to sign in.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Button
                variant="muted"
                onClick={() => {
                  if (!data.user?.email) return;

                  const formData = new FormData();
                  formData.set("email", data.user.email);
                  formData.set("callbackUrl", "/dashboard/account");

                  forgotPasswordAction(formData);
                }}
              >
                Reset Password
              </Button>
              <AnimatePresence initial={false} mode="wait">
                {passwordMessage && (
                  <AuthFormMessage message={passwordMessage} />
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}

        <Card className="w-full [border-bottom:2px_solid_hsl(var(--error))]">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>
              Delete your account and all associated data.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AlertDialog
              trigger={<Button variant="error">Delete Account</Button>}
              title="Delete Account"
              description={
                <>
                  Are you sure you want to delete your account?
                  <br />
                  This action is <span className="text-fg">irreversible</span>.
                </>
              }
              confirm="Delete Account"
              cancel="Cancel"
              onConfirm={() => {
                mutateDeleteAccount();
              }}
              confirmProps={{
                disabled: deleteConfirmation !== "delete my account",
                loading: isPendingDeleteAccount,
              }}
              open={deleteConfirmDialogOpen}
              onOpenChange={setDeleteConfirmDialogOpen}
            >
              <div className="flex flex-col gap-3">
                <p className="text-fg-300">
                  To confirm, please enter{" "}
                  <span className="text-fg">delete my account</span> into the
                  text field below.
                </p>
                <Input
                  placeholder="delete my account"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                />
              </div>
            </AlertDialog>
            <AnimatePresence initial={false} mode="wait">
              {passwordMessage && <AuthFormMessage message={passwordMessage} />}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
