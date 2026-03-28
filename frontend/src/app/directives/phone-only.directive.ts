import { Directive, HostListener, ElementRef, Renderer2, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * PhoneOnlyDirective
 * ─────────────────────────────────────────────────────────────────
 * Apply [appPhoneOnly] to any <input> to enforce:
 *   • Numeric-only characters (blocks letters, symbols, spaces)
 *   • Maximum 10 digits
 *   • Strips non-numeric chars on paste
 *   • Works with Template-driven (ngModel), Reactive (formControlName), or plain inputs
 *
 * Usage:
 *   <input appPhoneOnly [(ngModel)]="phone" />
 *   <input appPhoneOnly formControlName="phone" />
 */
@Directive({ selector: '[appPhoneOnly]' })
export class PhoneOnlyDirective {

    private readonly MAX_LENGTH = 10;

    private readonly ALLOWED_KEYS = new Set([
        'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'Clear'
    ]);

    constructor(
        private el: ElementRef<HTMLInputElement>,
        private renderer: Renderer2,
        @Optional() private control: NgControl   // @Optional prevents crash when no form control
    ) {
        this.renderer.setAttribute(this.el.nativeElement, 'type', 'tel');
        this.renderer.setAttribute(this.el.nativeElement, 'maxlength', String(this.MAX_LENGTH));
        this.renderer.setAttribute(this.el.nativeElement, 'inputmode', 'numeric');
        this.renderer.setAttribute(this.el.nativeElement, 'pattern', '[0-9]*');
        if (!this.el.nativeElement.placeholder) {
            this.renderer.setAttribute(this.el.nativeElement, 'placeholder', '10-digit mobile number');
        }
    }

    @HostListener('keydown', ['$event'])
    onKeyDown(e: KeyboardEvent): void {
        // Allow Ctrl/Cmd shortcuts
        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) {
            return;
        }
        if (this.ALLOWED_KEYS.has(e.key)) { return; }
        // Block non-digit keys
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            return;
        }
        // Block if already at max length (unless deleting)
        if (this.el.nativeElement.value.replace(/[^0-9]/g, '').length >= this.MAX_LENGTH) {
            e.preventDefault();
        }
    }

    @HostListener('paste', ['$event'])
    onPaste(e: ClipboardEvent): void {
        e.preventDefault();
        const pasted = e.clipboardData?.getData('text') || '';
        const cleaned = pasted.replace(/[^0-9]/g, '').slice(0, this.MAX_LENGTH);
        this.setVal(cleaned);
    }

    @HostListener('input')
    onInput(): void {
        const input = this.el.nativeElement;
        const cleaned = input.value.replace(/[^0-9]/g, '').slice(0, this.MAX_LENGTH);
        if (input.value !== cleaned) {
            this.setVal(cleaned);
        }
    }

    private setVal(val: string): void {
        const input = this.el.nativeElement;
        if (this.control?.control) {
            this.control.control.setValue(val, { emitEvent: true });
        } else {
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}
