import Swal from 'sweetalert2';

const primary = '#b1913f';
const error = '#ba1a1a';

export const swal = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: 'rounded-xl',
    confirmButton:
      'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-label-md bg-primary text-on-primary hover:opacity-90 mx-1',
    cancelButton:
      'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-label-md bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container mx-1',
    denyButton:
      'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium text-label-md bg-error text-on-error hover:opacity-90 mx-1',
  },
});

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const toastSuccess = (message: string) => {
  toast.fire({ icon: 'success', title: message, iconColor: primary });
};

export const toastError = (message: string) => {
  toast.fire({ icon: 'error', title: message, iconColor: error });
};

export const toastInfo = (message: string) => {
  toast.fire({ icon: 'info', title: message, iconColor: primary });
};

export const confirmAction = async (options: {
  title: string;
  text?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> => {
  const result = await swal.fire({
    icon: 'warning',
    iconColor: options.danger === false ? primary : error,
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmLabel ?? 'Ya, lanjutkan',
    cancelButtonText: options.cancelLabel ?? 'Batal',
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
};
