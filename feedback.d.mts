export function shrinkFeedbackImage(file:File):Promise<{url:string;size:string}>;
export function submitFeedback(report:{kind:string;text:string;contact?:string;locale?:string;details?:boolean;image?:string|null}):Promise<void>;
