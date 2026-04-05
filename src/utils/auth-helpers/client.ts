'use client';

// import { createClient } from '@/lib/supabase/client';
// import { type Provider } from '@supabase/supabase-js';
import { getURL } from '@/utils/helpers';
import { redirectToPath } from './server';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

type RHFValues = Record<string, unknown>
type FormEventLike = React.FormEvent<HTMLFormElement>

export async function handleRequest(
  input: RHFValues | FormEventLike,
  requestFunc: (formData: FormData) => Promise<string>,
  router: AppRouterInstance | null = null
): Promise<boolean | void> {
  let formData: FormData;

  // Detecta si es un evento de formulario tradicional
  if (typeof (input as FormEventLike).preventDefault === 'function') {
    const e = input as FormEventLike;
    // Prevent default form submission refresh
    e.preventDefault();
    formData = new FormData(e.currentTarget);
    console.log(`handleRequest: ${e.currentTarget}`);
  } else {
    // Asume que es un objeto plano (desde useForm / RHF)
    const values = input as RHFValues;
    formData = new FormData();
    for (const key in values) {
      formData.append(key, String(values[key]));
      console.log(`handleRequest: ${key} = ${values[key]}`);
    }
  }

  const redirectUrl = await requestFunc(formData);

  if (router) {
    // If client-side router is provided, use it to redirect
    return router.push(redirectUrl);
  } else {
    // Otherwise, redirect server-side
    return await redirectToPath(redirectUrl);
  }
}

export async function signInWithOAuth(e: React.FormEvent<HTMLFormElement>) {
  // Prevent default form submission refresh
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  // const provider = String(formData.get('provider')).trim() as Provider;

  // Create client-side supabase client and call signInWithOAuth
  // const supabase = createClient();
  const redirectURL = getURL('/auth/callback');
  // await supabase.auth.signInWithOAuth({
  //   provider: provider,
  //   options: {
  //     redirectTo: redirectURL
  //   }
  // });
}